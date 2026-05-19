resource "aws_instance" "app" {
  ami           = var.ec2_ami
  instance_type = var.ec2_instance_type
  key_name      = var.ec2_key_pair

  subnet_id                   = aws_subnet.public_a.id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true

  user_data = templatefile("${path.module}/user_data.sh", {
    app_name    = var.app_name
    environment = var.environment
    aws_region  = var.aws_region
    db_host     = aws_db_instance.postgres.address
    redis_host  = aws_elasticache_cluster.redis.cache_nodes[0].address
  })

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "${var.app_name}-server"
    Environment = var.environment
  }

  # Ensure RDS and Redis are ready before EC2 starts
  depends_on = [
    aws_db_instance.postgres,
    aws_elasticache_cluster.redis,
  ]
}
